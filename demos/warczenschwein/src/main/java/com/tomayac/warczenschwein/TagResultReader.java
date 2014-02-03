package com.tomayac.warczenschwein;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Properties;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileStatus;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IOUtils;
import org.apache.hadoop.io.SequenceFile;
import org.apache.hadoop.io.Writable;
import org.apache.hadoop.util.ReflectionUtils;

public class TagResultReader {
	public static void main(String[] args) throws IOException {
		Properties props = System.getProperties();
		props.setProperty("java.security.krb5.realm", "");
		props.setProperty("java.security.krb5.kdc", "");
		props.setProperty("java.security.krb5.conf", "/dev/null");

		String uri = args[0];
		Configuration conf = new Configuration();
		FileSystem fs = FileSystem.get(URI.create(uri), conf);
		Path path = new Path(uri);
		Collection<Path> paths = new ArrayList<Path>();
		if (fs.getFileStatus(path).isDir()) {
			for (FileStatus fss : fs.listStatus(path)) {
				if (fss.getPath().toString().contains("part-")) {
					paths.add(fss.getPath());
				}
			}
		} else {
			paths.add(path);
		}

		SequenceFile.Reader reader = null;
		for (Path p : paths) {
			try {
				reader = new SequenceFile.Reader(fs, p, conf);
				Writable key = (Writable) ReflectionUtils.newInstance(
						reader.getKeyClass(), conf);
				Writable value = (Writable) ReflectionUtils.newInstance(
						reader.getValueClass(), conf);

				while (reader.next(key, value)) {
					System.out.println(key.toString() + "\n" + value.toString()
							+ "\n");
				}
			} finally {
				IOUtils.closeStream(reader);
			}
		}
	}
}
